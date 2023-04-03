import NotificationItem from '@/components/NotificationItem'
import PageHeader from '@/components/PageHeader'
import { getAndFormatAllPushMessages, pushClient } from '@/utils/WalletConnectUtil'
import { Text } from '@nextui-org/react'
import { PushClientTypes } from '@walletconnect/push-client'
import { Fragment, useCallback, useEffect, useState } from 'react'

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<PushClientTypes.PushMessageRecord[]>([])

  const handleDeleteNotification = useCallback(async (notificationId: number) => {
    pushClient.deletePushMessage({ id: notificationId })
    setNotifications(notifs => notifs.filter(notif => notif.id !== notificationId))
  }, [])

  useEffect(() => {
    pushClient.on('push_message', () => {
      const formattedMessages = getAndFormatAllPushMessages()
      setNotifications(formattedMessages)
    })
  }, [])

  // Get notifications for the initial state
  useEffect(() => {
    const formattedMessages = getAndFormatAllPushMessages()

    setNotifications(formattedMessages)
  }, [])

  return (
    <Fragment>
      <PageHeader title="Notifications" />
      {notifications.length ? (
        notifications
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
        <Text css={{ opacity: '0.5', textAlign: 'center', marginTop: '$20' }}>
          No notifications
        </Text>
      )}
    </Fragment>
  )
}
