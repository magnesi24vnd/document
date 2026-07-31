import React from "react";
import cn from "classnames";
import { Link } from "react-router-dom";
import styles from "./Main.module.sass";
import ScrollButton from "../../../components/ScrollButton";
import Cards from "./Cards";

const Main = ({ scrollToRef }) => {
  return (
    <div className={cn("section", styles.main)}>
      <div className={cn("container", styles.container)}>
        <div className={styles.wrap}>
          <h1 className={cn("h1", styles.title)}>
            Buy & sell <br></br>crypto in minutes
          </h1>
          <div className={styles.text}>
            Trade Bitcoin, Ethereum, USDT, and the top altcoins on the legendary
            crypto asset exchange.
          </div>
          <Link className={cn("button", styles.button)} to="/sign-up">
            Get started now
          </Link>
          <ScrollButton
            onScroll={() =>
              scrollToRef.current.scrollIntoView({ behavior: "smooth" })
            }
            className={styles.scroll}
          />
        </div>
        <div className={styles.bg}>
          <img
            srcSet="/images/content/cards@2x.png 2x"
            src="/images/content/cards.png"
            alt="Cards"
          />
        </div>
        <Cards className={styles.cards} />
      </div>
    </div>
  );
};

export default Main;
