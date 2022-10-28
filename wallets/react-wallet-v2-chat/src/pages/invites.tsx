import PageHeader from '@/components/PageHeader'
import { Fragment, useEffect, useState } from 'react'

export default function InvitesPage() {
  return (
    <Fragment>
      <PageHeader title="Chat Requests" />

      {/* {chatThreads.length ? (
        chatThreads.map(props => {
          return <ChatSummaryCard key={props.topic} {...props} />
        })
      ) : (
        <Text css={{ opacity: '0.5', textAlign: 'center', marginTop: '$20' }}>No chats</Text>
      )} */}
    </Fragment>
  )
}
