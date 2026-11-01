import { render } from "solid-js/web";
import App from "./app";

const root = document.getElementById('app') // use your real root id
root.textContent = ''
render(() => <App />, root)