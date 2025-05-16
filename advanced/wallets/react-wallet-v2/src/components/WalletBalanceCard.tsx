import { Button, Card, Grid, Text, Spacer, Modal, Row } from '@nextui-org/react'
import VerticalAlignBottomIcon from '@mui/icons-material/VerticalAlignBottom';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import SendIcon from '@mui/icons-material/Send';
import { useState } from 'react';

export default function WalletBalanceCard() {
  // Placeholder balance
  const balance = '27.55'
  const currency = 'USD' // Or any other currency symbol
  const [depositModalOpen, setDepositModalOpen] = useState(false);

  const handleDepositAction = (action: string) => {
    if (action === 'show_address') {
      console.log('Show address selected');
      // Future: Implement show address logic
    } else if (action === 'from_exchange') {
      console.log('Deposit from exchange selected');
      window.open('URL', '_blank');
    }
    setDepositModalOpen(false); // Close modal after action
  };

  const openDepositModal = () => setDepositModalOpen(true);
  const closeDepositModal = () => setDepositModalOpen(false);

  return (
    <Card>
      <Card.Body style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '1rem', marginBottom: '1rem' }}>
        <Text h2 size={60} style={{ margin: 0 }}>
          {balance}
        </Text>
        <Text h5 style={{ margin: 0, color: 'var(--nextui-colors-gray700)' }}>
          {currency}
        </Text>
        <Spacer y={1.5} />
        <Grid.Container gap={1} justify="center" alignItems="center">
          <Grid>
            <Button
              auto
              rounded
              icon={<VerticalAlignBottomIcon />}
              color="primary"
              style={{ minWidth: 'auto', width: '50px', height: '50px' }}
              onClick={openDepositModal}
            />
          </Grid>
          <Grid>
            <Button auto rounded icon={<SwapHorizIcon />} color="secondary" style={{ minWidth: 'auto', width: '50px', height: '50px' }} />
          </Grid>
          <Grid>
            <Button auto rounded icon={<SendIcon />} color="gradient" style={{ minWidth: 'auto', width: '50px', height: '50px' }} />
          </Grid>
        </Grid.Container>
      </Card.Body>

      <Modal
        closeButton
        blur
        aria-labelledby="deposit-modal-title"
        open={depositModalOpen}
        onClose={closeDepositModal}
      >
        <Modal.Header>
          <Text id="deposit-modal-title" size={18}>
            Deposit Options
          </Text>
        </Modal.Header>
        <Modal.Body>
          <Button
            flat
            color="primary"
            auto
            onClick={() => handleDepositAction('show_address')}
          >
            Show Address
          </Button>
          <Spacer y={0.5} />
          <Button
            flat
            color="primary"
            auto
            onClick={() => handleDepositAction('from_exchange')}
          >
            Deposit from Exchange
          </Button>
        </Modal.Body>
        <Modal.Footer>
          <Button auto flat color="error" onClick={closeDepositModal}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </Card>
  )
} 