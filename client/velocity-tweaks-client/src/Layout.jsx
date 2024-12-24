import React from "react";
import NavBar from "../../velocity-tweaks-client/src/components/ui/NavBar/NavBar.jsx";
import Footer from "./components/ui/Footer";
import Home from "./pages/Home/Home.jsx"
import { RecoilRoot } from "recoil";


export default function Layout(props)
{
    return <div className="text-white">
        <NavBar></NavBar>
        {props.page}
        <Footer></Footer>
    </div>
}

