// src/components/Column/Column.js
import styles from './Column.module.scss';
import CardForm from '../CardForm/Cardform';
import Card from '../Card/Card';
import { usePouchCards, usePouchActions } from '../../hooks/pouchHooks';

const Column = ({ columnId, listId, title, icon }) => {
  const cards = usePouchCards({ listId, categoryId: columnId });
  const { destroyCategory } = usePouchActions();

  const handleDeleteColumn = () => {
    console.log('[Column] delete category', { columnId });
    destroyCategory(columnId);
  };

  return (
    <article className={styles.column}>
      <h2 className={styles.title}>
        <span className={`fa fa-${icon} ${styles.icon}`} /> {title}
        <button
          className={styles.removeBtn}
          title="Delete column"
          onClick={handleDeleteColumn}
        >
          ✖
        </button>
      </h2>

      <ul className={styles.cards}>
        {cards.map(card => (
          <Card
            key={card._id}
            id={card._id}
            title={card.title}
            isFavorite={card.isFavorite}
          />
        ))}
      </ul>

      <CardForm columnId={columnId} listId={listId} />
    </article>
  );
};

export default Column;
