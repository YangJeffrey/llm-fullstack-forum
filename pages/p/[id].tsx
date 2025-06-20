import React, { useState, useEffect } from 'react';
import { GetServerSideProps } from 'next';
import Router from 'next/router';
import Layout from '../../components/Layout';
import { PostProps, ResponseProps } from '../../components/Post';
import { useSession } from 'next-auth/react';
import prisma from '../../lib/prisma';
import {
  Button,
  Flex,
  TextInput,
  Text,
  Paper,
  Group,
  Badge,
  Stack,
  Textarea,
  Card,
  Divider,
} from '@mantine/core';
import { toast } from 'react-hot-toast';
import { useWebSocket } from '../../components/WebSocketProvider';

export const getServerSideProps: GetServerSideProps = async ({ params }) => {
  const post = await prisma.post.findUnique({
    where: {
      id: String(params?.id),
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

  if (!post) {
    return {
      notFound: true,
    };
  }

  // Serialize dates for JSON
  const serializedPost = {
    ...(post as any),
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
    responses:
      (post as any).responses?.map((response: any) => ({
        ...response,
        createdAt: response.createdAt.toISOString(),
        updatedAt: response.updatedAt.toISOString(),
      })) || [],
  };

  return {
    props: serializedPost,
  };
};

async function updatePost(
  id: string,
  title: string,
  content: string,
  status?: string
): Promise<void> {
  try {
    const response = await fetch(`/api/post/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title, content, status }),
    });

    if (response.ok) {
      toast.success('Post updated successfully');
      Router.push('/posts');
    } else {
      const error = await response.json();
      toast.error(`Error: ${error.message}`);
    }
  } catch (error) {
    toast.error('Failed to update post');
  }
}

const Post: React.FC<PostProps> = (props) => {
  const { data: session, status } = useSession();
  const { lastMessage } = useWebSocket();
  const isLoggedIn = status === 'authenticated';

  const [editTitle, setEditTitle] = useState(props.title);
  const [code, setCode] = useState(props.content || '');
  const [postData, setPostData] = useState(props);
  const [isEditing, setIsEditing] = useState(false);
  const [newResponse, setNewResponse] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [aiAnswer, setAiAnswer] = useState('');
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  const handleResponseAdd = (postId: string, newResponseData: ResponseProps) => {
    if (postId === props.id) {
      setPostData((prev) => {
        // Check if response already exists to prevent duplicates
        const existingResponse = prev.responses?.find(r => r.id === newResponseData.id);
        if (existingResponse) {
          return prev; // Don't add if it already exists
        }

        return {
          ...prev,
          responses: [newResponseData, ...(prev.responses || [])],
          status: 'ANSWERED',
        };
      });
    }
  };

  useEffect(() => {
    if (lastMessage) {
      if (lastMessage.type === 'new_response') {
        const newResponseData = lastMessage.data;
        handleResponseAdd(newResponseData.postId, newResponseData);
        // toast.success('New response added!');
      } else if (lastMessage.type === 'question_update' && lastMessage.data.id === props.id) {
        const updatedPost = lastMessage.data;
        setPostData(updatedPost);
        toast.success('Question updated!');
      }
    }
  }, [lastMessage, props.id]);

  if (status === 'loading') {
    return <div>Loading...</div>;
  }

  const generateAnswer = async () => {
    setIsGeneratingAI(true);
    try {
      const prompt = `Question: ${postData.title}\n\nDetails: ${postData.content || 'No additional details provided'}`;

      const backendUrl = process.env.NEXT_PUBLIC_FASTAPI_URL || 'http://localhost:8000';
      const response = await fetch(`${backendUrl}/ai/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt,
          type: 'response',
        }),
      });

      if (!response.ok) {
        throw new Error('AI generation failed');
      }

      const data = await response.json();
      setAiAnswer(data.generated_content);
      toast.success('AI answer generated successfully!');
    } catch (error) {
      console.error('Error generating AI answer:', error);
      toast.error('Failed to generate AI answer. Please try again.');
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const submitResponse = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!newResponse.trim()) return;

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/responses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: newResponse,
          postId: props.id,
        }),
      });

      if (response.ok) {
        // Don't add response optimistically - let WebSocket handle it
        setNewResponse('');
        toast.success('Response added successfully!');
      } else {
        const error = await response.json();
        toast.error(`Error: ${error.message}`);
      }
    } catch (error) {
      toast.error('Failed to add response');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSave = async () => {
    await updatePost(props.id, editTitle, code);
    setIsEditing(false);
  };

  const handleDelete = async () => {
    try {
      const response = await fetch(`/api/post/${props.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Post deleted successfully');
        Router.push('/posts');
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
      const response = await fetch(`/api/post/${props.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'ESCALATED' }),
      });

      if (response.ok) {
        toast.success('Question marked as escalated');
        setPostData((prev) => ({ ...prev, status: 'ESCALATED' }));
      } else {
        const error = await response.json();
        toast.error(`Error: ${error.message}`);
      }
    } catch (error) {
      toast.error('Failed to escalate question');
    }
  };

  const handleMarkAsAnswered = async () => {
    try {
      const response = await fetch(`/api/post/${props.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'ANSWERED' }),
      });

      if (response.ok) {
        toast.success('Question marked as answered');
        setPostData((prev) => ({ ...prev, status: 'ANSWERED' }));
      } else {
        const error = await response.json();
        toast.error(`Error: ${error.message}`);
      }
    } catch (error) {
      toast.error('Failed to update question status');
    }
  };

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

  return (
    <Layout>
      <Paper shadow="sm" p="md" withBorder w="100%">
        {isEditing ? (
          <Flex direction="column" gap="md">
            <TextInput
              label="Title"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              placeholder="Title"
            />
            <Textarea
              label="Content"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Content"
              minRows={4}
            />
            <Group>
              <Button variant="outline" onClick={handleSave}>
                Save Changes
              </Button>
              <Button variant="subtle" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
            </Group>
          </Flex>
        ) : (
          <Flex direction="column" gap="md">
            <Group justify="space-between">
              <Text size="xl" fw={700}>
                {postData.title}
              </Text>
              {postData.status && (
                <Badge color={getStatusColor(postData.status)} variant="light">
                  {postData.status}
                </Badge>
              )}
            </Group>

            <Text>{postData.content || 'No content'}</Text>

            <Group justify="space-between">
              <Text size="sm" c="dimmed">
                Posted by: {postData.author?.name || 'Anonymous'}
              </Text>
              <Text size="sm" c="dimmed">
                {postData.createdAt && new Date(postData.createdAt).toLocaleString()}
              </Text>
            </Group>

            {isLoggedIn && (
              <Group>
                {postData.status !== 'ANSWERED' && (
                  <Button variant="subtle" size="sm" onClick={handleMarkAsAnswered}>
                    Mark as Answered
                  </Button>
                )}
                {postData.status === 'PENDING' && (
                  <Button variant="default" size="sm" onClick={handleMarkAsEscalated}>
                    Escalate Post
                  </Button>
                )}
                <Button variant="default" color="red" onClick={handleDelete}>
                  Delete Post
                </Button>
              </Group>
            )}

            <Divider my="md" />
            <Text size="lg" fw={600}>
              Responses ({postData.responses?.length || 0})
            </Text>

            <Stack gap="xs">
              <Button
                onClick={generateAnswer}
                loading={isGeneratingAI}
                variant="light"
                color="blue"
              >
                {isGeneratingAI ? 'Generating AI Answer...' : 'See AI Answer'}
              </Button>
              {aiAnswer && (
                <Card withBorder padding="md" radius="sm" bg="blue.0">
                  <Text size="sm" fw={500} mb="xs" c="blue.8">
                    AI Answer:
                  </Text>
                  <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
                    {aiAnswer}
                  </Text>
                </Card>
              )}
            </Stack>

            <form onSubmit={submitResponse}>
              <Stack gap="md">
                <Text fw={600}>Add a Response</Text>
                <Textarea
                  placeholder="Write your response here..."
                  value={newResponse}
                  onChange={(e) => setNewResponse(e.target.value)}
                  minRows={3}
                  required
                />
                <Group justify="flex-end">
                  <Button
                    type="submit"
                    disabled={isSubmitting || !newResponse.trim()}
                    loading={isSubmitting}
                  >
                    {isSubmitting ? 'Adding Response...' : 'Add Response'}
                  </Button>
                </Group>
              </Stack>
            </form>

            <Stack gap="md">
              {postData.responses && postData.responses.length > 0 ? (
                postData.responses.map((response) => (
                  <Card key={response.id} padding="md" radius="sm" withBorder>
                    <Text size="sm" mb="xs">
                      {response.content}
                    </Text>
                    <Text size="xs" c="dimmed">
                      By {response.author?.name || 'Anonymous'} •{' '}
                      {new Date(response.createdAt).toLocaleString()}
                    </Text>
                  </Card>
                ))
              ) : (
                <Text size="sm" c="dimmed" ta="center" py="xl">
                  No responses yet.
                </Text>
              )}
            </Stack>
          </Flex>
        )}
      </Paper>
    </Layout>
  );
};

export default Post;
