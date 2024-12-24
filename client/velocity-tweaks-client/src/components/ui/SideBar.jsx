import React, { useState } from "react";
import { authStateAtom, buttonState } from "../../services/state/store";
import { useRecoilState, useRecoilValue } from "recoil";
import { Link } from "react-router-dom";
export function SideBar() {
  const [button, setButton] = useRecoilState(buttonState);

  const authState = useRecoilValue(authStateAtom);

  return (
    <div>
      <ul
        className={
          button
            ? "ease-in-out duration-500 fixed left-[-100%]"
            : "fixed left-0 top-0 w-[50%] h-full border-r border-r-gray-900 bg-[#000300] ease-in-out duration-500"
        }
      >
        <div className="bg-black h-screen">
          <h1 className="  font-Inter w-full font-black text-white text-xl cursor-pointer p-4 pt-9 pb-10">
            Velocity Tweaks
          </h1>

          <Link to="/faq">
            {" "}
            <li className="p-4 border-b  font-Inter text-white border-gray-600 hover:text-gray-300 cursor-pointer ">
              FAQ
            </li>
          </Link>
          <Link to="/store">
            {" "}
            <li className="p-4 border-b font-Inter text-white border-gray-600 hover:text-gray-300 cursor-pointer">
              Store
            </li>
          </Link>
          <Link to="/contact">
            {" "}
            <li className="p-4 font-Inter border-b border-gray-600 text-white hover:text-gray-300 cursor-pointer">
              Contact
            </li>
          </Link>
          <Link to="/cart">
            {" "}
            <li className="p-4 font-Inter border-b border-gray-600 text-white hover:text-gray-300 cursor-pointer">
              Cart
            </li>
          </Link>

          {!authState ? (
            <>
              <Link to="/login">
                <li className="p-4 font-Inter  text-white hover:text-gray-300 cursor-pointer">
                  Login
                </li>
              </Link>
            </>
          ) : (
            <>
             <Link to="/user/dashboard/profile">
            {" "}
            <li className="p-4 font-Inter border-b border-gray-600 text-white hover:text-gray-300 cursor-pointer">
              Dashboard
            </li>
          </Link>
              <li
                onClick={() => {
                  window.location.href =
                    import.meta.env.VITE_domainName + "/auth/logout";
                }}
                className="p-4 font-Inter  text-red-300 hover:text-gray-300 cursor-pointer"
              >
                Logout
              </li>
            </>
          )}
        </div>
      </ul>
    </div>
  );
}

// my orders
// my profile
// logout
