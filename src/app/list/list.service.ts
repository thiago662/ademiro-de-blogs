import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ListService {

  constructor(
    private http: HttpClient,
  ) { }

  getPosts() {
    return this.http.get(environment.urlApi + '/teste-projects.json', {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
      }),
    }).toPromise();
  }

  createPost(post: any) {
    return this.http.post(environment.urlApi + '/teste-projects.json', post, {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
      }),
    }).toPromise();
  }
}
