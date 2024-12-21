import axios from 'axios';
import { showAlert } from './alerts';

// type is either 'password' or 'data'
// data is an object with the to be updated data
export const updateSettings = async (data, type) => {
  try {
    const url =
      type === 'password'
        ? 'http://localhost:8000/api/v1/users/updatePassword'
        : 'http://localhost:8000/api/v1/users/updateMe';
    const res = await axios({
      method: 'PATCH',
      url: url,
      data,
    });
    if (res.data.status === 'success') {
      showAlert('success', `${type.toUpperCase()} updated succesfully`);
    }
  } catch (err) {
    showAlert('error', err.response.data.message);
  }
};
