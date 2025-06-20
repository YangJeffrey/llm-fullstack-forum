import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { options } from '../../api/auth/[...nextauth]';
import prisma from '../../../lib/prisma';

// POST /api/post
export default async function handle(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { title, content } = req.body;

  // Validate required fields
  if (!title) {
    return res.status(400).json({ message: 'Title is required' });
  }

  try {
    const session = await getServerSession(req, res, options);
    const authorData = session
      ? {
          connect: { email: session.user?.email || '' },
        }
      : undefined;

    const data: any = {
      title: title,
      content: content || null,
    };

    if (session?.user?.email) {
      data.author = authorData;
    }

    const result = await prisma.post.create({
      data,
      include: {
        author: {
          select: { name: true, email: true },
        },
      },
    });

    // Call FastAPI backend to broadcast the new question and send emails
    try {
      const backendUrl = process.env.FASTAPI_URL || 'http://localhost:8000';

      const questionData = {
        id: result.id,
        title: result.title,
        content: result.content || '',
        author: result.author || { name: 'Anonymous', email: '' },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const response = await fetch(`${backendUrl}/broadcast/new-question`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(questionData),
      });

      if (!response.ok) {
        console.error('Failed to broadcast question:', await response.text());
      }
    } catch (error) {
      console.error('Error calling FastAPI backend:', error);
    }

    res.status(201).json(result);
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
