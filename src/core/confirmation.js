export class Confirmation {
  static confirmMethod(message, _element, _submitter) {
    return Promise.resolve(confirm(message))
  }
}
