import NotificationItem from '@/components/NotificationItem'
import PageHeader from '@/components/PageHeader'
import { getAndFormatNotifications, pushClient } from '@/utils/WalletConnectUtil'
import { Text, Collapse, Grid, Avatar, Button } from '@nextui-org/react'
import { PushClientTypes } from '@walletconnect/push-client'
import Image from 'next/image'
import { Fragment, useCallback, useEffect, useState } from 'react'

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<
    {
      subscription: PushClientTypes.PushSubscription
      messages: PushClientTypes.PushMessageRecord[]
    }[]
  >([])

  const handleDeleteNotification = useCallback(async (messageId: number) => {
    pushClient.deletePushMessage({ id: messageId })
    const formattedNotifications = getAndFormatNotifications()
    setNotifications(formattedNotifications)
  }, [])

  const handleDeleteSubscription = useCallback(async (topic: string) => {
    await pushClient.deleteSubscription({ topic })
    const formattedNotifications = getAndFormatNotifications()
    setNotifications(formattedNotifications)
  }, [])

  useEffect(() => {
    pushClient.on('push_message', () => {
      const formattedNotifications = getAndFormatNotifications()
      setNotifications(formattedNotifications)
    })
  }, [])

  // Get notifications for the initial state
  useEffect(() => {
    const formattedNotifications = getAndFormatNotifications()
    setNotifications(formattedNotifications)
  }, [])

  return (
    <Fragment>
      <PageHeader title="Notifications" />

      <Grid.Container gap={2}>
        <Grid>
          <Collapse.Group shadow>
            {notifications.map(notification => (
              <Collapse
                key={notification.subscription.topic}
                title={<Text h4>{notification.subscription.metadata.name}</Text>}
                subtitle={notification.subscription.metadata.description}
                contentLeft={
                  <Avatar
                    size="lg"
                    src={notification.subscription.metadata.icons[0]}
                    color="secondary"
                    bordered
                    squared
                  />
                }
              >
                <Button
                  bordered
                  css={{
                    width: '100%',
                    marginBottom: '$6'
                  }}
                  color="error"
                  auto
                  onClick={() => handleDeleteSubscription(notification.subscription.topic)}
                >
                  <Image src={'/icons/delete-icon.svg'} width={15} height={15} alt="delete icon" />
                  Delete subscription
                </Button>
                {notification.messages.length ? (
                  notification.messages
                    .sort((a, b) => b.publishedAt - a.publishedAt)
                    .map(({ id, message, publishedAt }) => (
                      <NotificationItem
                        key={id}
                        logo={message.icon}
                        url={message.url}
                        title={message.title}
                        body={message.body}
                        publishedAt={publishedAt}
                        onDelete={() => handleDeleteNotification(id)}
                      />
                    ))
                ) : (
                  <Text css={{ opacity: '0.5', textAlign: 'center', marginTop: '$6' }}>
                    No notifications
                  </Text>
                )}
              </Collapse>
            ))}
          </Collapse.Group>
        </Grid>
      </Grid.Container>
    </Fragment>
  )
}
