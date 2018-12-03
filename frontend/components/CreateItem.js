import React, { Component } from "react";
import { Mutation } from "react-apollo";
import gql from "graphql-tag";
import Router from "next/router";
import Form from "./styles/Form";
import formatMoney from "../lib/formatMoney";
import Error from "./ErrorMessage";

const CREATE_ITEM_MUTATION = gql`
  mutation CREATE_ITEM_MUTATION(
    $title: String!
    $description: String!
    $image: String
    $largeImage: String
    $price: Int!
  ) {
    createItem(
      title: $title
      description: $description
      image: $image
      largeImage: $largeImage
      price: $price
    ) {
      id
    }
  }
`;

class CreateItem extends Component {
  state = {
    title: "",
    desctiption: "",
    image: "",
    largeImage: "",
    price: 0
  };
  onChange = event => {
    const { name, type } = event.target;
    const value = type === "number" ? parseFloat(event.target.value) : event.target.value;
    this.setState({ [name]: value });
  };
  onUpload = async event => {
    const files = event.target.files;
    const data = new FormData();
    data.append("file", files[0]);
    data.append("upload_preset", "sickfits");

    const file = await fetch("https://api.cloudinary.com/v1_1/dxfiu4qet/image/upload", {
      method: "POST",
      body: data
    }).then(res => res.json());
    console.log(file);
    this.setState({
      image: file.secure_url,
      largeImage: file.eager[0].secure_url
    });
  };
  render() {
    return (
      <Mutation mutation={CREATE_ITEM_MUTATION} variables={this.state}>
        {(createItem, { loading, error }) => (
          <Form
            onSubmit={async event => {
              event.preventDefault();
              const res = await createItem();
              Router.push({
                pathname: "/item",
                query: { id: res.data.createItem.id }
              });
            }}
          >
            <Error error={error} />
            <fieldset disabled={loading} aria-busy={loading}>
              <label>
                Image
                <input
                  type="file"
                  name="file"
                  placeholder="Upload an image"
                  required
                  onChange={this.onUpload}
                />
                {this.state.image && (
                  <img src={this.state.image} alt="Upload preview" width="200" />
                )}
              </label>

              <label>
                Title
                <input
                  type="text"
                  name="title"
                  placeholder="Title"
                  required
                  value={this.state.title}
                  onChange={this.onChange}
                />
              </label>

              <label>
                Price
                <input
                  type="number"
                  name="price"
                  placeholder="Price"
                  required
                  value={this.state.price}
                  onChange={this.onChange}
                />
              </label>

              <label>
                Description
                <textarea
                  name="description"
                  placeholder="Enter a description"
                  required
                  value={this.state.description}
                  onChange={this.onChange}
                />
              </label>
            </fieldset>
            <button type="submit">Submit</button>
          </Form>
        )}
      </Mutation>
    );
  }
}

export default CreateItem;
export { CREATE_ITEM_MUTATION };
