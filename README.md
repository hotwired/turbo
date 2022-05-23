# Turbo

Turbo uses complementary techniques to dramatically reduce the amount of custom JavaScript that most web applications will need to write:

* [Turbo Drive](https://turbo.hotwired.dev/handbook/drive) accelerates links and form submissions by negating the need for full page reloads.
* [Turbo Frames](https://turbo.hotwired.dev/handbook/frames) decompose pages into independent contexts, which scope navigation and can be lazily loaded.
* [Turbo Streams](https://turbo.hotwired.dev/handbook/streams) deliver page changes over WebSocket or in response to form submissions using just HTML and a set of CRUD-like actions.
* [Turbo Native](https://turbo.hotwired.dev/handbook/native) lets your majestic monolith form the center of your native iOS and Android apps, with seamless transitions between web and native sections.

It's all done by sending HTML over the wire. And for those instances when that's not enough, you can reach for the other side of Hotwire, and finish the job with [Stimulus](https://github.com/hotwired/stimulus).

Read more on [turbo.hotwired.dev](https://turbo.hotwired.dev).

© 2022 Basecamp, LLC.
