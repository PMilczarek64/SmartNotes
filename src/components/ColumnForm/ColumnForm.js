import styles from './ColumnForm.module.scss';
import { useState } from 'react';
import Button from '../Button/Button';
import TextInput from '../TextInput/TextInput';
import { usePouchActions } from '../../hooks/pouchHooks';

const ColumnForm = ({ listId }) => {
  const { createColumn } = usePouchActions();

  const [title, setTitle] = useState('');
  const [icon, setIcon] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!title.trim()) return;

    createColumn({
      listId,
      title,
      icon,
      createdAt: new Date().toISOString(),
      type: 'column',
    });

    setTitle('');
    setIcon('');
  };

  return (
    <form className={styles.columnForm} onSubmit={handleSubmit}>
      <TextInput
        className={styles.input}
        type="text"
        placeholder="Column title..."
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />

      <TextInput
        className={styles.input}
        type="text"
        placeholder="Icon (optional)..."
        value={icon}
        onChange={(e) => setIcon(e.target.value)}
      />

      <Button>Add column</Button>
    </form>
  );
};

export default ColumnForm;
