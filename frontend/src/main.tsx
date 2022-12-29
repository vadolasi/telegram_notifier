import { render } from "preact"
import routes from "~react-pages"
import { Suspense } from "preact/compat"
import { BrowserRouter as Router, useRoutes } from "react-router-dom"
import { Toaster } from "react-hot-toast"

import "uno.css"

const App = () => {
  return (
    <Suspense fallback={<p>Loading...</p>}>
      {useRoutes(routes)}
    </Suspense>
  )
}

render(
  <Router>
    <App />
    <Toaster />
  </Router>,
  document.getElementById("app") as HTMLElement
)
