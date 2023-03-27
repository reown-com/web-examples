import Navigation from '@/components/Navigation'
import RouteTransition from '@/components/RouteTransition'
import { Card, Container, Loading } from '@nextui-org/react'
import { Fragment, ReactNode } from 'react'

/**
 * Types
 */
interface Props {
  initialized: boolean
  children: ReactNode | ReactNode[]
}

/**
 * Container
 */
export default function Layout({ children, initialized }: Props) {
  return (
    <Container
      display="flex"
      justify="center"
      alignItems="center"
      css={{
        width: '100vw',
        height: '100vh',
        padding: 0
      }}
    >
      <Card
        variant="bordered"
        css={{
          height: '100%',
          width: '100%',
          justifyContent: initialized ? 'normal' : 'center',
          alignItems: initialized ? 'normal' : 'center',
          borderRadius: 0,
          '@xs': {
            borderRadius: '$lg',
            height: '95vh',
            maxWidth: '450px'
          }
        }}
      >
        {initialized ? (
          <Fragment>
            <RouteTransition>
              <Card.Body
                css={{
                  display: 'block',
                  padding: 10,
                  paddingTop: 10,
                  '@xs': {
                    padding: 40,
                    paddingTop: 30
                  }
                }}
              >
                {children}
              </Card.Body>
            </RouteTransition>

            <Card.Footer
              css={{
                height: '85px',
                minHeight: '85px',
                position: 'sticky',
                justifyContent: 'flex-end',
                alignItems: 'flex-end',
                boxShadow: '0 -30px 20px #16181A',
                backgroundColor: '#16181A',
                zIndex: 200,
                inset: 0,
                paddingLeft: 40,
                paddingRight: 40,
                paddingBottom: 30
              }}
            >
              <Navigation />
            </Card.Footer>
          </Fragment>
        ) : (
          <Loading />
        )}
      </Card>
    </Container>
  )
}
