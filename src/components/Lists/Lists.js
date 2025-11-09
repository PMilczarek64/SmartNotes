import React from "react";
import { Link } from "react-router-dom";
import styles from "./Lists.module.scss";
import { usePouchLists } from "../../hooks/pouchHooks";
import ListForm from "../ListForm/ListForm";
import RemoveButton from "../RemoveButton/RemoveButton";

const Lists = () => {
  const lists = usePouchLists();

  console.log('%c[Lists.js] lists received from hook:', 'color:yellow', lists);

  return (
    <section className={styles.lists}>
      {(lists.length ?
        <h2 className={styles.heading}>Pick a notebook or create a new one ;)</h2> :
        <h2 className={styles.heading}>Fill in the fields to add your first notebook... ;)</h2>
      )}

      {lists.map((list) => (
        <div className={styles.list} key={list._id}>
          <Link
            to={`/list/${list._id}`}   // ← bez encodeURIComponent
            className={styles.listLink}
          >
            <h3>{list.title}</h3>
            {list.description ? <p>{list.description}</p> : null}
          </Link>
          <RemoveButton id={list._id} />
        </div>
      ))}

      <ListForm />
    </section>
  );
};

export default Lists;
