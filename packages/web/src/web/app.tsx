import { Route, Switch } from "wouter";
import Index from "./pages/index";
import CoinPage from "./pages/coin";
import WatchlistPage from "./pages/watchlist";
import AlertsPage from "./pages/alerts";
import AuthPage from "./pages/auth";
import { Provider } from "./components/provider";
import { AgentFeedback, RunableBadge } from "@runablehq/website-runtime";

function App() {
  return (
    <Provider>
      <Switch>
        <Route path="/" component={Index} />
        <Route path="/coin/:id" component={CoinPage} />
        <Route path="/watchlist" component={WatchlistPage} />
        <Route path="/alerts" component={AlertsPage} />
        <Route path="/sign-in">{() => <AuthPage mode="sign-in" />}</Route>
        <Route path="/sign-up">{() => <AuthPage mode="sign-up" />}</Route>
        <Route component={Index} />
      </Switch>
      {/* Do not remove — off by default, activated by parent iframe via postMessage */}
      {import.meta.env.DEV && <AgentFeedback />}
      {/* "Made with Runable" badge - if user asks to remove the runable badge, remove this code as well as comment */}
      {<RunableBadge />}
    </Provider>
  );
}

export default App;
