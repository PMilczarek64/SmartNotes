// src/components/List/List.js
import React from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import styles from './List.module.scss';

import {
  usePouchLists,
  usePouchColumns,
} from '../../hooks/pouchHooks';

import Column from '../Column/Column';
import ColumnForm from '../ColumnForm/ColumnForm';
import SearchForm from '../SearchFrom/SearchFrom';

const List = () => {
  const { id } = useParams();

  const lists = usePouchLists();
  const list = lists.find(l => l._id === id);
  const categories = usePouchColumns(list?._id);

  if (!list) return <Navigate to="/" />;

  return (
    <section className={styles.list}>
      <header className={styles.header}>
        <h2 className={styles.title}>{list.title}</h2>
        {list.description && <p className={styles.description}>{list.description}</p>}
      </header>
      <div className={styles.contentWrapper}>
        <div className={styles.formsBar}>
          <ColumnForm listId={list._id} />
          <SearchForm />
        </div>
        <div className={styles.columnsWrapper}>
        <div className={styles.columns}>
          {categories.map(category => (
            <Column
              key={category._id}
              title={category.title}
              icon={category.icon}
              columnId={category._id}
              listId={list._id}
            />
          ))}
        </div>
      </div>
      </div>
      {categories.length === 0 && <p className={styles.empty}>No columns yet.</p>}
    </section>
  );
};

export default List;
