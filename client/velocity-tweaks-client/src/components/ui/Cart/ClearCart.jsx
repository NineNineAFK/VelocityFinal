import axios from "axios";
import React, { useEffect, useState } from "react";
import { FaRegTrashCan } from "react-icons/fa6";
import { useNavigate } from "react-router-dom";
import { useSetRecoilState } from "recoil";
import { cartStateDB } from "../../../services/state/store";
import { toast } from "react-toastify";

export default function ClearCart() {

  const navigate = useNavigate(); 
  const setCartStateNew = useSetRecoilState(cartStateDB); 



  async function clearCartClick()
  { 
    const response = await axios.post(import.meta.env.VITE_domainName + "/cart/cart/clear", {}, {
      withCredentials: true
    });
    setCartStateNew(response.data.items);  
  }
  
  return (
    <button onClick={clearCartClick}   className="rounded-lg font-Inter font-medium w-full flex justify-end  mt-2 pr-8">
      <div className="flex justify-center gap-x-1 hover:text-gray-300 hover:duration-150 text-sm pr-3">
        <div className="pt-1">
          <FaRegTrashCan></FaRegTrashCan>
        </div>
        <div className="pt-[1px] font-light">Clear Cart</div>
      </div>
    </button>
  );
}



