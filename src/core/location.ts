export type Locatable = Location | string

export class Location {
  static get currentLocation() {
    return this.wrap(window.location.toString())
  }

  static wrap(locatable: Locatable): Location
  static wrap(locatable?: Locatable | null): Location | undefined
  static wrap(locatable: Locatable) {
    if (typeof locatable == "string") {
      return new this(locatable)
    } else if (locatable != null) {
      return locatable
    }
  }

  readonly link: HTMLAnchorElement = document.createElement("a")
  private _requestURL?: string
  private _anchor?: string

  constructor(url: string) {
    this.link.href = url
  }

  get absoluteURL() {
    return this.link.href
  }

  get requestURL() {
    if (this._requestURL) return this._requestURL

    if (typeof this.anchor === 'undefined') {
      return this._requestURL = this.absoluteURL
    } else {
      return this._requestURL = this.absoluteURL.split('#')[0]
    }
  }

  get origin() {
    return this.link.origin
  }

  get path() {
    return this.link.pathname
  }

  get anchor() {
    if (this._anchor) return this._anchor

    let anchorMatch
    if (this.link.hash) {
      return this._anchor = this.link.hash.slice(1)
    } else if (anchorMatch = this.absoluteURL.match(/#(.*)$/)) {
      return this._anchor = anchorMatch[1]
    }
  }

  get pathComponents() {
    return this.path.split("/").slice(1)
  }

  get lastPathComponent() {
    return this.pathComponents.slice(-1)[0]
  }

  get extension() {
    return (this.lastPathComponent.match(/\.[^.]*$/) || [])[0] || ""
  }

  isHTML() {
    return !!this.extension.match(/^(?:|\.(?:htm|html|xhtml))$/)
  }

  isPrefixedBy(location: Location): boolean {
    const prefixURL = getPrefixURL(location)
    return this.isEqualTo(location) || stringStartsWith(this.absoluteURL, prefixURL)
  }

  isEqualTo(location?: Location) {
    return location && this.absoluteURL === location.absoluteURL
  }

  toCacheKey() {
    return this.requestURL
  }

  toJSON() {
    return this.absoluteURL
  }

  toString() {
    return this.absoluteURL
  }

  valueOf() {
    return this.absoluteURL
  }
}

function getPrefixURL(location: Location) {
  return addTrailingSlash(location.origin + location.path)
}

function addTrailingSlash(url: string) {
  return stringEndsWith(url, "/") ? url : url + "/"
}

function stringStartsWith(string: string, prefix: string) {
  return string.slice(0, prefix.length) === prefix
}

function stringEndsWith(string: string, suffix: string) {
  return string.slice(-suffix.length) === suffix
}
