import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import TripEditPage from "./TripEditPage";

const CurrentLocation = () => {
  const location = useLocation();
  return <output>{location.pathname + location.search}</output>;
};
test("legacy edit link redirects into same trip detail route with day and add intent intact", () => {
  render(<MemoryRouter initialEntries={["/route-edit?id=12&day=3&add=1"]}>
    <Routes>
      <Route path="/route-edit" element={<TripEditPage/>}/>
      <Route path="/route-result" element={<CurrentLocation/>}/>
    </Routes>
  </MemoryRouter>);
  expect(screen.getByText("/route-result?id=12&edit=1&day=3&add=1")).toBeInTheDocument();
});
test("legacy edit links without an add intent open ordinary inline editing", () => {
  render(<MemoryRouter initialEntries={["/route-edit?id=12&day=1"]}>
    <Routes>
      <Route path="/route-edit" element={<TripEditPage/>}/>
      <Route path="/route-result" element={<CurrentLocation/>}/>
    </Routes>
  </MemoryRouter>);
  expect(screen.getByText("/route-result?id=12&edit=1&day=1")).toBeInTheDocument();
});
