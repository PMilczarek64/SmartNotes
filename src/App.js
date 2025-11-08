import NavBar from "./components/NavBar/NavBar";
import Home from "./components/Home/Home";
import Container from "./components/Container/Container";
import Favorite from "./components/Favorite/Favorite";
import About from "./components/About/About";
import { Routes, Route } from 'react-router-dom';
import NotFound from "./components/NotFound/NotFound";
import List from "./components/List/List.js"
import NoteEditor from './components/NoteEditor/NoteEditor';

const App = () => {
  return (
    <div>
      <NavBar />
      <Container>
        <Routes>
          <Route path="*" element={<NotFound />} />
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/Favorite" element={<Favorite />} />
          <Route path="/list/:id" element={<List />} />
          <Route path="/card/:id" element={<NoteEditor />} />
        </Routes>
      </Container>
    </div>
  );
};

export default App;
