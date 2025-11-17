// src/components/CardForm/CardForm.js
import styles from './CardForm.module.scss';
import TextInput from '../TextInput/TextInput';
import Button from '../Button/Button';
import { useState } from 'react';
import { usePouchActions } from '../../hooks/pouchHooks';

const CardForm = ({ columnId, listId }) => {
  const { createCard } = usePouchActions();
  const [title, setTitle] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    createCard({ listId, categoryId: columnId, title });
    setTitle('');
  };

  return (
    <form className={styles.cardForm} onSubmit={handleSubmit}>
      <TextInput value={title} placeholder='Card title...' onChange={e => setTitle(e.target.value)} />
      <Button>Add card</Button>
    </form>
  );
};

export default CardForm;
