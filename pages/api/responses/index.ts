import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { options } from '../auth/[...nextauth]';
import prisma from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { content, postId } = req.body;

    if (!content || !postId) {
      return res.status(400).json({ message: 'Content and postId are required' });
    }

    try {
      const session = await getServerSession(req, res, options);
      let userId = null;

      // If user is logged in, find their user record
      if (session?.user?.email) {
        const user = await prisma.user.findUnique({
          where: { email: session.user.email },
        });
        if (user) {
          userId = user.id;
        }
      }

      // Create the response (with or without author)
      const newResponse = await (prisma as any).response.create({
        data: {
          content,
          postId,
          authorId: userId, // Will be null for anonymous responses
        },
        include: {
          author: {
            select: { name: true, email: true },
          },
        },
      });

      // Update post status to ANSWERED if it was PENDING
      try {
        await (prisma as any).post.updateMany({
          where: {
            id: postId,
            status: 'PENDING',
          },
          data: {
            status: 'ANSWERED',
          },
        });
      } catch (statusUpdateError) {
        console.log('Status update failed:', statusUpdateError);
        // Continue anyway, the response was created successfully
      }

      // Broadcast the new response via WebSocket if available
      try {
        const backendUrl = process.env.FASTAPI_URL || 'http://localhost:8000';

        const responseData = {
          id: newResponse.id,
          content: newResponse.content,
          postId: newResponse.postId,
          author: newResponse.author || { name: 'Anonymous', email: '' },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        const wsResponse = await fetch(`${backendUrl}/broadcast/new-response`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(responseData),
        });

        if (!wsResponse.ok) {
          console.error('Failed to broadcast response:', await wsResponse.text());
        }
      } catch (error) {
        console.error('WebSocket broadcast failed:', error);
      }

      return res.status(201).json(newResponse);
    } catch (error) {
      console.error('Error creating response:', error);
      return res.status(500).json({ message: 'Error creating response' });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
