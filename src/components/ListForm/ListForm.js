import React, { useState } from 'react';
import Button from '../Button/Button';
import TextInput from '../TextInput/TextInput';
import styles from './ListForm.module.scss';

// ⬇️ zamiast useDispatch i listsRedux używamy hooka z PouchDB
import { usePouchActions } from '../../hooks/pouchHooks';

const ListForm = () => {
  const { createList } = usePouchActions();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    // zapis do bazy lokalnej (PouchDB)
    createList({ title, description });

    // czyszczenie pól formularza
    setTitle('');
    setDescription('');
  };

  return (
    <form className={styles.listForm} onSubmit={handleSubmit}>
      <TextInput
        placeholder="Title"
        className={styles.input}
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <TextInput
        placeholder="Description"
        className={styles.input}
        type="text"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <Button>Add Notebook</Button>
    </form>
  );
};

export default ListForm;
