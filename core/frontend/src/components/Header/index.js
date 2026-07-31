import React, { useState } from "react";
import cn from "classnames";
import styles from "./Header.module.sass";
import { Link, NavLink } from "react-router-dom";
import Image from "../Image";
import Dropdown from "./Dropdown";
import Settings from "./Settings";
import Icon from "../Icon";
import Notifications from "./Notifications";
import Theme from "../Theme";
import User from "./User";
import { useVNKR } from "../../contexts/VNKRContext";

const navigation = [
  {
    title: "Exchange",
    url: "/exchange",
  },
  {
    title: "Trade",
    dropdown: [
      { title: "Swap / AMM", icon: "exchange", url: "/exchange" },
      { title: "OTC / P2P", icon: "user", url: "/market" },
      { title: "Buy Crypto", icon: "image", url: "/buy-crypto" },
    ],
  },
  {
    title: "Market",
    url: "/market",
  },
  {
    title: "VNKR Chain",
    dropdown: [
      { title: "Staking & Earn", icon: "lightning", url: "/staking" },
      { title: "Block Explorer", icon: "search", url: "/explorer" },
      { title: "Testnet Faucet", icon: "download", url: "/faucet" },
      { title: "DAO Governance", icon: "share", url: "/dao" },
    ],
  },
  {
    title: "Discover",
    url: "/learn-crypto",
  },
];

const Header = ({ headerWide }) => {
  const [visibleNav, setVisibleNav] = useState(false);
  const { wallet, connectWallet, disconnectWallet, formatAddress } = useVNKR();

  const handleWalletClick = async () => {
    if (wallet.isConnected) return;
    try {
      await connectWallet();
    } catch (err) {
      console.warn("Wallet connect failed:", err.message);
    }
  };

  return (
    <header className={cn(styles.header, { [styles.wide]: headerWide })}>
      <div className={cn("container", styles.container)}>
        <Link className={styles.logo} to="/" onClick={() => setVisibleNav(false)}>
          <Image
            className={styles.picDesktop}
            src="/images/logo-light.svg"
            srcDark="/images/logo-dark.svg"
            alt="VNKR"
          />
          <img className={styles.picMobile} src="/images/logo.svg" alt="VNKR" />
        </Link>

        <div className={styles.wrapper}>
          <div className={cn(styles.wrap, { [styles.visible]: visibleNav })}>
            <nav className={styles.nav}>
              {navigation.map((x, index) =>
                x.dropdown ? (
                  <Dropdown
                    className={styles.dropdown}
                    key={index}
                    item={x}
                    setValue={setVisibleNav}
                  />
                ) : (
                  <NavLink
                    className={styles.item}
                    activeClassName={styles.active}
                    onClick={() => setVisibleNav(false)}
                    to={x.url}
                    key={index}
                  >
                    {x.title}
                  </NavLink>
                )
              )}
            </nav>

            {/* VNKR Network Badge */}
            <div style={{
              display: "flex", alignItems: "center", gap: 5,
              fontSize: 11, fontWeight: 600, color: "#58BD7D",
              background: "rgba(88,189,125,0.1)", border: "1px solid rgba(88,189,125,0.3)",
              borderRadius: 20, padding: "3px 10px", marginLeft: 4,
            }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#58BD7D", display: "inline-block" }} />
              VNKR Testnet
            </div>
          </div>

          <Settings className={styles.settings} />

          <div className={styles.control}>
            <NavLink
              className={styles.activity}
              activeClassName={styles.active}
              to="/activity"
            >
              <Icon name="lightning" size="24" />
            </NavLink>

            <Notifications className={styles.notifications} />

            {wallet.isConnected ? (
              <button
                onClick={disconnectWallet}
                className={cn("button-stroke button-small", styles.button)}
                style={{ minWidth: 120, fontFamily: "monospace", fontSize: 12 }}
              >
                {formatAddress(wallet.address)}
              </button>
            ) : (
              <button
                onClick={handleWalletClick}
                className={cn("button button-small", styles.button)}
                style={{ background: "linear-gradient(135deg, #3772FF, #7B3FE4)", border: "none", color: "#fff" }}
              >
                Connect Wallet
              </button>
            )}

            <Theme className={styles.theme} icon />
            <User className={styles.user} />
          </div>

          <button
            className={cn(styles.burger, { [styles.active]: visibleNav })}
            onClick={() => setVisibleNav(!visibleNav)}
          />
        </div>
      </div>
    </header>
  );
};

export default Header;
