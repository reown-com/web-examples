import ModalStore from "@/store/ModalStore"
import { useAppKit, useAppKitAccount, useAppKitState } from "@reown/appkit/react"
import { useEffect } from "react"
import LoadingModal from "./LoadingModal"
import RequestModalContainer from "@/components/RequestModalContainer"
import { Row, Col, Loading, Divider, Text } from "@nextui-org/react"
import { useSnapshot } from "valtio"

export default function AppKitConnectionModal() {
    const { open } = useAppKitState()
    const { isConnected, status } = useAppKitAccount()

    const { view } = useSnapshot(ModalStore.state)

    // for now just open appkit modal if not connected
    // useEffect(() => {
    //     console.log('appkit connection modal', status)
    //     if (!isConnected && status !== undefined && status !== 'reconnecting' && status !== 'connecting') {
    //       appkit.open()
    //     }
    // }, [isConnected, status])

    return (
        <RequestModalContainer title="">
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <Row>
            <Col>
              <Loading size="lg" />
            </Col>
          </Row>
          <Row align="center">
            <Col>
              <Text h3>Connecting to Reown...</Text>
            </Col>
          </Row>

        </div>
      </RequestModalContainer>
    )
}