import Head from 'next/head'
import React from 'react'
import { SampleComponent } from './SampleComponent'
import { Box, Container } from '@mantine/core'
import Link from 'next/link'

export default function Home() {
  return (
    <Box>
      <Container>
        <Box>
          <Link href="/station_gg/1130208">
            スタート
          </Link>
        </Box>
      </Container>
    </Box>
  )
}
