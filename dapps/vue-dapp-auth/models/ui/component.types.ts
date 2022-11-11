export interface DynamicComponent<
TAttrs extends Record<string, any> = Record<string, any>,
> {
  is: string
  attrs?: TAttrs
}
