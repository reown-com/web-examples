import { Fragment } from 'react'
import { Card, Col, Row, Image, Text } from '@nextui-org/react'

interface ProductMetadata {
  name: string
  description?: string
  imageUrl?: string
  price?: string
}

interface ProductCardProps {
  product: ProductMetadata
}

function ProductCard({ product }: ProductCardProps) {
  return (
    <Card style={{ marginBottom: '16px', backgroundColor: '#2A2A2A' }}>
      <Card.Body style={{ padding: '8px' }}>
        <Row style={{ alignItems: 'center', height: '72px' }}>
          {product.imageUrl && (
            <Col style={{ width: 'auto' }}>
              <Image
                src={product.imageUrl}
                alt={product.name}
                width={64}
                height={64}
                objectFit="cover"
              />
            </Col>
          )}
          <Col style={{ paddingLeft: product.imageUrl ? '16px' : 0 }}>
            <Text style={{ fontSize: '18px' }}>{product.name}</Text>
            <Row justify="space-between">
              {product.price && (
                <Row>
                  <Text b style={{ color: '#8c8c8c', fontSize: '14px' }}>
                    {'Price '}
                  </Text>
                  <span style={{ fontSize: '14px' }}>{product.price}</span>
                </Row>
              )}
            </Row>
          </Col>
        </Row>
      </Card.Body>
    </Card>
  )
}

interface ProductsProps {
  products?: ProductMetadata[]
}

export default function Products({ products }: ProductsProps) {
  if (!products || products.length === 0) {
    return null
  }

  return (
    <Fragment>
      {products.map((product, idx) => (
        <ProductCard key={idx} product={product} />
      ))}
    </Fragment>
  )
}
