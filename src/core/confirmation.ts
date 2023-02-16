export class Confirmation {
  static confirmMethod(message: string, _element: Element, _submitter: Element | undefined): Promise<boolean> {
    return Promise.resolve(confirm(message))
  }
}
