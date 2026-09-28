function App() {
  return (
    <main className="app-shell">
      <div className="app-content">
        <p className="eyebrow">League of Legends</p>
        <h1>League Item Advisor</h1>
        <p className="intro">
          Situational item recommendations for your current match.
        </p>

        <section className="placeholder" aria-label="Advisor status">
          <span className="status-dot" aria-hidden="true" />
          <div>
            <h2>Advisor preview</h2>
            <p>Match information and item suggestions will appear here.</p>
          </div>
        </section>
      </div>
    </main>
  )
}

export default App
