export class SessionStorage {
  set(key:string, value:any) {
    sessionStorage.setItem(key, JSON.stringify(value))
  }

  get(key:string) {
    return JSON.parse(sessionStorage.getItem(key) || 'null')
  }

  remove(key:string) {
    sessionStorage.removeItem(key)
  }
}
