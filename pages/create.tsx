import React, { useState } from 'react';
import Layout from '../components/Layout';
import Router from 'next/router';
import { Container, Paper, Title, TextInput, Textarea, Button, Stack, Group } from '@mantine/core';
import { toast } from 'react-hot-toast';

const Draft: React.FC = () => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  const submitData = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    try {
      const body = { title, content };
      await fetch('/api/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      await Router.push('/posts');
      toast.success('Question created successfully!');
    } catch (error) {
      console.error(error);
      toast.error('Failed to create question. Please try again.');
    }
  };

  return (
    <Layout>
      <Paper shadow="sm" p="md" withBorder w="100%">
        <form onSubmit={submitData}>
          <Stack gap="md">
            <Title size="h2">New Question</Title>

            <div style={{ position: 'relative' }}>
              <TextInput
                label="Title"
                placeholder="Enter your question title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                size="md"
              />
            </div>

            <div style={{ position: 'relative' }}>
              <Textarea
                label="Content"
                placeholder="Describe your question in detail"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                required
                minRows={6}
                size="md"
              />
            </div>

            <Group justify="flex-end" mt="md">
              <Button variant="subtle" onClick={() => Router.push('/posts')}>
                Cancel
              </Button>
              <Button type="submit" disabled={!content || !title} size="md">
                Create Question
              </Button>
            </Group>
          </Stack>
        </form>
      </Paper>
    </Layout>
  );
};

export default Draft;
