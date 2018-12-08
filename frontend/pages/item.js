import SingleItem from "../components/SingleItem";

const Home = props => (
  <div>
    <SingleItem id={props.query.id} />
  </div>
);
export default Home;
