// SYNTHETIC demo file: the same page after the kit's rules were followed. Not a real app.
import { Links, Meta, Outlet, Scripts } from "react-router";
import { POLARIS_URL } from "./lib/polaris";

export default function App() {
  return (
    <html lang="en">
      <head>
        <Meta />
        <Links />
        <script src={POLARIS_URL}></script>
      </head>
      <body>
        <Outlet />
        <Scripts />
      </body>
    </html>
  );
}
