import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { options } from '../auth/[...nextauth]';
import prisma from '../../../lib/prisma';

// GET /api/post/:id
// PUT /api/post/:id
// DELETE /api/post/:id
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  // GET request - public access
  if (req.method === 'GET') {
    try {
      const post = await prisma.post.findUnique({
        where: { id: String(id) },
        include: {
          author: {
            select: { name: true, email: true },
          },
          responses: {
            include: {
              author: {
                select: { name: true, email: true },
              },
            },
            orderBy: {
              createdAt: 'desc',
            },
          },
        },
      });

      if (!post) {
        return res.status(404).json({ message: 'Post not found' });
      }

      return res.json(post);
    } catch (error) {
      return res.status(500).json({ message: 'Error fetching post' });
    }
  }

  if (req.method === 'PUT') {
    const { title, content, status } = req.body;
    try {
      const post = await prisma.post.update({
        where: { id: String(id) },
        data: {
          title,
          content,
          ...(status && { status }),
        },
        include: {
          author: {
            select: { name: true, email: true },
          },
          responses: {
            include: {
              author: {
                select: { name: true, email: true },
              },
            },
            orderBy: {
              createdAt: 'desc',
            },
          },
        },
      });

      // Broadcast the update via WebSocket
      try {
        const ws = new WebSocket('ws://localhost:8000/ws');
        ws.onopen = () => {
          ws.send(
            JSON.stringify({
              type: 'question_update',
              data: post,
            })
          );
          ws.close();
        };
      } catch (error) {
        console.error('WebSocket broadcast failed:', error);
      }

      return res.json(post);
    } catch (error) {
      return res.status(500).json({ message: 'Error updating post' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      await prisma.post.delete({
        where: { id: String(id) },
      });

      // Broadcast the deletion via WebSocket
      try {
        const ws = new WebSocket('ws://localhost:8000/ws');
        ws.onopen = () => {
          ws.send(
            JSON.stringify({
              type: 'delete_question',
              data: { id },
            })
          );
          ws.close();
        };
      } catch (error) {
        console.error('WebSocket broadcast failed:', error);
      }

      return res.status(204).end();
    } catch (error) {
      return res.status(500).json({ message: 'Error deleting post' });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
