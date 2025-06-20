import Layout from '../components/Layout';
import Post, { PostProps } from '../components/Post';
import React, { useEffect } from 'react';
import Router from 'next/router';
import prisma from '../lib/prisma';
import { GetStaticProps } from 'next';
import { Title, Text, Image, Center, Flex } from '@mantine/core';
import { useSession } from 'next-auth/react';

// export const getStaticProps: GetStaticProps = async () => {
//   const feed = await prisma.post.findMany({
//     include: {
//       author: {
//         select: { name: true },
//       },
//     },
//   });
//   return {
//     props: { feed },
//     revalidate: 10,
//   };
// };

// type Props = {
//   feed: PostProps[]
// }

const Home: React.FC = () => {
  useEffect(() => {
    Router.push('/posts');
  }, []);

  return (
    <Layout>
      <Center w="100%" h="100%">
        <Flex direction="column" align="center" justify="center" gap="sm">
          <Title>Forum</Title>
        </Flex>
      </Center>
    </Layout>
  );
};

export default Home;
