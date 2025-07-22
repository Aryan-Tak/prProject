'use client';

import { IconHeart } from '@tabler/icons-react';
import {
  ActionIcon,
  Button,
  Card,
  Group,
  Image,
  Text,
} from '@mantine/core';
import { useRouter } from 'next/navigation';

type Props = {
  title: string;
  image: string;
  description: string;
  route: string;
};

export function ActivityCard({ title, image, description, route }: Props) {
  const router = useRouter();

  return (
    <Card withBorder radius="md" p="md" className="w-full max-w-sm mx-auto shadow-md">
      <Card.Section>
        <Image src={image} alt={title} height={180} />
      </Card.Section>

      <Card.Section mt="md">
        <Group justify="apart">
          <Text fz="lg" fw={500}>
            {title}
          </Text>
        </Group>
        <Text fz="sm" mt="xs">
          {description}
        </Text>
      </Card.Section>

      <Group mt="md">
        <Button radius="md" style={{ flex: 1 }} onClick={() => router.push(route)}>
          Show details
        </Button>
        <ActionIcon variant="default" radius="md" size={36}>
          <IconHeart stroke={1.5} />
        </ActionIcon>
      </Group>
    </Card>
  );
}
