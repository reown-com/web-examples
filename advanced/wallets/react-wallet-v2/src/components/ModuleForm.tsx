import { Fragment, useMemo } from 'react'
import OwnableValidatorForm from '@/views/OwnableValidatorForm'
import { ModuleView } from '@/data/ERC7579ModuleData'

export default function ModuleForm({ view }: { view?: ModuleView }) {
  const componentView = useMemo(() => {
    switch (view) {
      case 'OwnableValidatorForm':
        return <OwnableValidatorForm />
      default:
        return null
    }
  }, [view])

  return <Fragment>{componentView}</Fragment>
}
