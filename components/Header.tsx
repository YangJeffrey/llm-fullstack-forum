import React from 'react';
import { useRouter } from 'next/router';
import { signOut, useSession } from 'next-auth/react';
import { Button, Group, Text, Avatar } from '@mantine/core';
import ColorSchemeToggle from './ColorSchemeToggle';

const Header: React.FC = () => {
  const router = useRouter();

  const { data: session, status } = useSession();

  return (
    <Group p={10} justify="space-between">
      <Group>
        <>
          <Button variant="filled" onClick={() => router.push('/posts')}>
            See Questions
          </Button>
          <Button variant="outline" onClick={() => router.push('/create')}>
            New Question
          </Button>
        </>
      </Group>

      <Group ml="auto" align="center">
        <ColorSchemeToggle />

        {!session && status !== 'loading' && (
          <Button variant="default" onClick={() => router.push('/api/auth/signin')}>
            Log in
          </Button>
        )}

        {session && (
          <>
            <Group gap="xs">
              <Avatar
                src={session.user.image}
                alt={session.user.name || 'User avatar'}
                radius="xs"
                size="sm"
              />
              <div>
                <Text size="xs" fw={500}>
                  {session.user.name}
                </Text>
                <Text size="xs" c="dimmed">
                  {session.user.email}
                </Text>
              </div>
            </Group>
            <Button variant="default" onClick={() => signOut()}>
              Log out
            </Button>
          </>
        )}
      </Group>
    </Group>
  );
};

export default Header;
