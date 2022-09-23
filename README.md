# Turbo

Turbo uses complementary techniques to dramatically reduce the amount of custom JavaScript that most web applications will need to write:

* Turbo Drive accelerates links and form submissions by negating the need for full page reloads.
* Turbo Frames decompose pages into independent contexts, which scope navigation and can be lazily loaded.
* Turbo Streams deliver page changes over WebSocket or in response to form submissions using just HTML and a set of CRUD-like actions.
* Turbo Native lets your majestic monolith form the center of your native iOS and Android apps, with seamless transitions between web and native sections.

It's all done by sending HTML over the wire. And for those instances when that's not enough, you can reach for the other side of Hotwire, and finish the job with [Stimulus](https://github.com/hotwired/stimulus).

Read more on [turbo.hotwired.dev](https://turbo.hotwired.dev).

# Installation
CLI:

```bash
npm i @hotwired/turbo"
```

Then in your code:
```javascript
import * as Turbo from "@hotwired/turbo"
```

# CDN Installation
URL: https://unpkg.com/@hotwired/turbo

The URL will redirect you to the latest version. For security, it's recommended to stick to the redirected version rather than use the URL above in the script src.

```html
<script src="https://unpkg.com/@hotwired/turbo@7.2.0/dist/turbo.es2017-umd.js"></script>
```

# Confirming that it works

Simply open your site and click any link specified as `<a href=...` and you should notice that it loads almost instantly.

For further proof, open DevTools (F12) and click the network tab, then click a link and you should see that the linked page load dynamically due to the previous page's network requests that are still present.

## Contributing

Please read [CONTRIBUTING.md](./CONTRIBUTING.md).

© 2021 37signals LLC.
