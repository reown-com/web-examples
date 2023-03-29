import NotificationItem from '@/components/NotificationItem'
import PageHeader from '@/components/PageHeader'
import { pushClient } from '@/utils/WalletConnectUtil'
import { Text } from '@nextui-org/react'
import { Fragment, useCallback, useEffect, useState } from 'react'

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState(() =>
    pushClient.messages.getAll().flatMap(message => Object.values(message.messages))
  )

  const handleDeleteNotification = useCallback(async (notificationId: number) => {
    pushClient.deletePushMessage({ id: notificationId })
    setNotifications(notifs => notifs.filter(notif => notif.id !== notificationId))
  }, [])

  useEffect(() => {
    pushClient.on('push_message', async newNotification => {
      if (notifications.find(notif => notif.id === newNotification.id)) {
        return
      }

      setNotifications(
        pushClient.messages.getAll().flatMap(message => Object.values(message.messages))
      )
    })
  }, [notifications])

  return (
    <Fragment>
      <PageHeader title="Notifications" />
      {notifications.length ? (
        notifications.map(({ id, message }) => {
          console.log(message.url)
          return (
            <NotificationItem
              key={id}
              logo={message.icon}
              url={message.url}
              title={message.title}
              body={message.body}
              onDelete={() => handleDeleteNotification(id)}
            />
          )
        })
      ) : (
        <Text css={{ opacity: '0.5', textAlign: 'center', marginTop: '$20' }}>
          No notifications
        </Text>
      )}
    </Fragment>
  )
}
