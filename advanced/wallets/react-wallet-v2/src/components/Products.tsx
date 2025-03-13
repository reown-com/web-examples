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
    <Card style={{ marginBottom: '16px' }}>
      <Card.Body style={{ padding: '8px' }}>
        <Row style={{ alignItems: 'center' }}>
          {product.imageUrl && (
            <Col style={{ width: 'auto' }}>
              <Image
                src={product.imageUrl}
                alt={product.name}
                width={100}
                height={100}
                objectFit="cover"
              />
            </Col>
          )}
          <Col style={{ paddingLeft: product.imageUrl ? '16px' : 0 }}>
            <Text h4 style={{ marginBottom: 0 }}>
              {product.name}
            </Text>
            {product.description && (
              <Text style={{ color: '#8c8c8c' }} size="small">
                {product.description}
              </Text>
            )}
            {product.price && (
              <Text size="medium" b>
                Price: {product.price}
              </Text>
            )}
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
      {/* <Text h5>Products</Text> */}
      {products.map((product, idx) => (
        <ProductCard key={idx} product={product} />
      ))}
    </Fragment>
  )
}
