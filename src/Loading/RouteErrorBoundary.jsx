import { Component } from "react";

export default class RouteErrorBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() { return { failed: true }; }

  componentDidCatch(error, info) {
    console.error("Route rendering failed", error, info.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <section className="not-found-page" role="alert">
        <div className="not-found-card">
          <h1>화면을 불러오지 못했어요</h1>
          <p>연결 상태를 확인한 뒤 다시 불러와 주세요.</p>
          <button className="not-found-action" onClick={() => window.location.reload()}>화면 다시 불러오기</button>
          <a href="/home">홈으로 이동</a>
        </div>
      </section>
    );
  }
}
