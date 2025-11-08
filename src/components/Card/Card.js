import styles from './Card.module.scss';
import FavoriteButton from '../FavoriteButton/FavoriteButton';
import RemoveButton from '../RemoveButton/RemoveButton';
import { Link } from 'react-router-dom';

const Card = ({ id, title, isFavorite }) => {
  return (
    <li className={styles.card}>
      <Link to={`/card/${id}`} className={styles.cardLink}>
        <div className={styles.content}>
          {title}
        </div>
      </Link>
      <div className={styles.buttons}>
        <FavoriteButton id={id} isFavorite={!!isFavorite} />
        <RemoveButton id={id} />
      </div>
    </li>
  );
};

export default Card;
