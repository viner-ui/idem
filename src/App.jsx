import MentionEditor from './MentionEditor';

export default function App() {
  return (
    <div className="app">
      <header className="app__header">
        <h1 className="app__title">Тестовое: упоминания в textarea</h1>
        <p className="app__subtitle">
          Введите <span className="app__subtitle-accent">@</span> и начните печатать, чтобы выбрать пользователя.
        </p>
      </header>
      <main className="app__main">
        <section className="mention-box">
          <label htmlFor="message" className="mention-box__label">Сообщение</label>
          <MentionEditor />
        </section>
      </main>
    </div>
  );
}
