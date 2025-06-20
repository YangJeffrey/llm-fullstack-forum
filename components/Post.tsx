import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Button, Flex, Text, Paper, Group, Badge, Menu } from '@mantine/core';
import { toast } from 'react-hot-toast';
import { IconPin } from '@tabler/icons-react';

export interface PostProps {
  id: string;
  title: string;
  content: string | null;
  author: {
    name: string;
    email: string;
  } | null;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
  responses?: ResponseProps[];
}

export interface ResponseProps {
  id: string;
  content: string;
  author: {
    name: string;
    email: string;
  } | null;
  createdAt: string;
  updatedAt?: string;
}

type PostComponentProps = {
  post: PostProps;
  onPostUpdate?: (postId: string, updates: Partial<PostProps>) => void;
  onPostDelete?: (postId: string) => void;
};

const Post: React.FC<PostComponentProps> = ({ post, onPostUpdate, onPostDelete }) => {
  const { data: session, status } = useSession();
  const isLoggedIn = status === 'authenticated';

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'yellow';
      case 'ANSWERED':
        return 'green';
      case 'ESCALATED':
        return 'red';
      default:
        return 'gray';
    }
  };

  const handleDelete = async () => {
    try {
      const response = await fetch(`/api/post/${post.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        if (onPostDelete) {
          onPostDelete(post.id);
        }
        toast.success('Post deleted successfully');
      } else {
        const error = await response.json();
        toast.error(`Error: ${error.message}`);
      }
    } catch (error) {
      toast.error('Failed to delete post');
    }
  };

  const handleMarkAsEscalated = async () => {
    try {
      if (onPostUpdate) {
        onPostUpdate(post.id, { status: 'ESCALATED' });
      }

      const response = await fetch(`/api/post/${post.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'ESCALATED' }),
      });

      if (response.ok) {
        toast.success('Question marked as escalated');
      } else {
        if (onPostUpdate) {
          onPostUpdate(post.id, { status: post.status });
        }
        const error = await response.json();
        toast.error(`Error: ${error.message}`);
      }
    } catch (error) {
      if (onPostUpdate) {
        onPostUpdate(post.id, { status: post.status });
      }
      toast.error('Failed to escalate question');
    }
  };

  const handleMarkAsAnswered = async () => {
    try {
      if (onPostUpdate) {
        onPostUpdate(post.id, { status: 'ANSWERED' });
      }

      const response = await fetch(`/api/post/${post.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'ANSWERED' }),
      });

      if (response.ok) {
        toast.success('Question marked as answered');
      } else {
        if (onPostUpdate) {
          onPostUpdate(post.id, { status: post.status });
        }
        const error = await response.json();
        toast.error(`Error: ${error.message}`);
      }
    } catch (error) {
      if (onPostUpdate) {
        onPostUpdate(post.id, { status: post.status });
      }
      toast.error('Failed to update question status');
    }
  };

  return (
    <Paper shadow="xs" p="md" withBorder>
      <Flex direction="column" gap="xs">
        <Flex justify="space-between" align="center">
          <Link href={`/p/${post.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
            <Text size="lg" fw={700}>
              {post.title}
            </Text>
          </Link>

          {(post.status === 'ANSWERED' || post.status === 'ESCALATED') && (
            <Badge
              variant="light"
              color={getStatusColor(post.status)}
              leftSection={post.status === 'ESCALATED' ? <IconPin size={12} /> : null}
            >
              {post.status}
            </Badge>
          )}
        </Flex>

        <Text lineClamp={2} size="sm" mb="lg">
          {post.content || 'No content'}
        </Text>

        <Flex justify="space-between" align="center" mt="xs">
          <Flex direction="column">
            <Text size="xs" c="dimmed">
              Posted by: {post.author?.name || 'Anonymous'}
            </Text>
            <Text size="xs" c="dimmed">
              {post.createdAt
                ? new Date(post.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : 'No date'}
            </Text>
          </Flex>

          <Group>
            {isLoggedIn && post.status !== 'ANSWERED' && (
              <Button variant="subtle" size="xs" onClick={handleMarkAsAnswered}>
                Mark as Answered
              </Button>
            )}

            <Link href={`/p/${post.id}`} passHref>
              <Button variant="filled" size="lg" w="100%">
                Open
              </Button>
            </Link>

            {isLoggedIn && (
              <Menu position="bottom-end" shadow="md">
                <Menu.Target>
                  <Button variant="default" size="xs">
                    Mod Actions
                  </Button>
                </Menu.Target>
                <Menu.Dropdown>
                  <Menu.Label>Moderator Actions</Menu.Label>
                  {post.status === 'PENDING' && (
                    <Menu.Item onClick={() => handleMarkAsEscalated()}>Escalate Post</Menu.Item>
                  )}
                  <Menu.Divider />
                  <Menu.Item color="red" onClick={() => handleDelete()}>
                    Delete Post
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>
            )}
          </Group>
        </Flex>
      </Flex>
    </Paper>
  );
};

export default Post;
