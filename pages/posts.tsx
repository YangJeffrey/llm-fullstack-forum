import React, { useState, useEffect } from 'react';
import { GetServerSideProps } from 'next';
import Layout from '../components/Layout';
import Post, { PostProps } from '../components/Post';
import prisma from '../lib/prisma';
import { Stack, Text } from '@mantine/core';
import { useWebSocket } from '../components/WebSocketProvider';
import { toast } from 'react-hot-toast';

export const getServerSideProps: GetServerSideProps = async () => {
  const posts = await prisma.post.findMany({
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
    orderBy: {
      createdAt: 'desc',
    },
  });

  // Convert dates to strings for JSON serialization
  const serializedPosts: PostProps[] = (posts as any[]).map((post: any) => ({
    id: post.id,
    title: post.title,
    content: post.content,
    author: post.author,
    status: post.status,
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
    responses:
      post.responses?.map((response: any) => ({
        id: response.id,
        content: response.content,
        author: response.author,
        createdAt: response.createdAt.toISOString(),
        updatedAt: response.updatedAt.toISOString(),
      })) || [],
  }));

  return {
    props: { initialPosts: serializedPosts },
  };
};

type Props = {
  initialPosts: PostProps[];
};

const PostsPage: React.FC<Props> = ({ initialPosts }) => {
  const [posts, setPosts] = useState<PostProps[]>(initialPosts);
  const { lastMessage } = useWebSocket();

  const handlePostUpdate = (postId: string, updates: Partial<PostProps>) => {
    setPosts((prevPosts) =>
      prevPosts.map((post) => (post.id === postId ? { ...post, ...updates } : post))
    );
  };

  const handlePostDelete = (postId: string) => {
    setPosts((prevPosts) => prevPosts.filter((post) => post.id !== postId));
  };

  // Sort posts by status priority: ESCALATED -> PENDING -> ANSWERED
  const sortPostsByStatus = (posts: PostProps[]) => {
    const statusPriority = {
      ESCALATED: 1,
      PENDING: 2,
      ANSWERED: 3,
    };

    return [...posts].sort((a, b) => {
      const priorityA = statusPriority[a.status as keyof typeof statusPriority] || 4;
      const priorityB = statusPriority[b.status as keyof typeof statusPriority] || 4;

      // If same priority, sort by creation date (newest first)
      if (priorityA === priorityB) {
        return new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime();
      }

      return priorityA - priorityB;
    });
  };

  useEffect(() => {
    if (lastMessage) {
      if (lastMessage.type === 'new_question') {
        const newPost = lastMessage.data;
        // Check if the post already exists to prevent duplicates
        setPosts((currentPosts) => {
          const existingPostIndex = currentPosts.findIndex((post) => post.id === newPost.id);
          if (existingPostIndex === -1) {
            // Post doesn't exist, add it
            return [newPost, ...currentPosts];
          } else {
            // Post already exists, don't add duplicate
            return currentPosts;
          }
        });
        // toast.success('New question posted!');
      } else if (lastMessage.type === 'new_response') {
        const newResponse = lastMessage.data;
        setPosts((currentPosts) =>
          currentPosts.map((post) =>
            post.id === newResponse.postId
              ? {
                  ...post,
                  responses: [newResponse, ...(post.responses || [])],
                  status: 'ANSWERED',
                }
              : post
          )
        );
        toast.success('New response added!');
      } else if (lastMessage.type === 'question_update') {
        const updatedPost = lastMessage.data;
        handlePostUpdate(updatedPost.id, updatedPost);
        toast.success('Question updated!');
      } else if (lastMessage.type === 'delete_question') {
        const deletedId = lastMessage.data.id;
        handlePostDelete(deletedId);
        toast.success('Question deleted!');
      }
    }
  }, [lastMessage]);

  const sortedPosts = sortPostsByStatus(posts);

  return (
    <Layout>
      <Text fw={900} size="lg" mb="md">
        Questions
      </Text>

      <Stack gap="md" w="100%">
        {sortedPosts.map((post) => (
          <div key={post.id} style={{ width: '100%' }}>
            <Post post={post} onPostUpdate={handlePostUpdate} onPostDelete={handlePostDelete} />
          </div>
        ))}
      </Stack>
    </Layout>
  );
};

export default PostsPage;
