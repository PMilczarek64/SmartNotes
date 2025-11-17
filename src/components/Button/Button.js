import styles from './Button.module.scss';

const Button = props => {
  return (<button className={styles.button + ' ' + props.extraClass}>{props.children}</button>);
};

export default Button;