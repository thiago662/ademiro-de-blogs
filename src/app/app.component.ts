import { Component } from '@angular/core';
import { environment } from '../environments/environment';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'ademiro-de-blogs';
  arrayPost = {
    i4vq70dmltj: {
      id: 'i4vq70dmltj',
      title: "PHP 8+: O que Mudou e Por Que Você Deve se Atualizar\"",
      subtitle: "Novos recursos de tipagem, atributos e performance não fique preso no passado.",
      active: false,
      created_by: "Thiago",
      category: "programação",
      topics: "php,laravel,angular,js,abc",
      thumbnail: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcToFHfi2H6yrPQX4xUUj2v60TRwxhKLaNyy8A&s",
      html: "<p>No desenvolvimento de software, acoplamento excessivo é um dos maiores vilões da manutenção e escalabilidade. Quando classes dependem diretamente umas das outras em vez de abstrações, qualquer mudança mínima pode quebrar partes inesperadas do sistema. É aí que a Injeção de Dependência (DI) se torna essencial: em vez de criar dependências internamente, seu código recebe tudo o que precisa \"de fora\" — seja via construtor, métodos ou containers. No PHP, isso não é apenas uma boa prática, mas um passo fundamental para escrever código limpo e testável.</p><p>Um dos maiores benefícios da DI é a facilidade de testes. Imagine uma classe que instancia diretamente um serviço de banco de dados: testá-la exigiria conexões reais, tornando os testes lentos e frágeis. Com injeção de dependências, você pode substituir esse serviço por um mock em segundos, garantindo testes unitários rápidos e confiáveis. Ferramentas como PHPUnit se integram perfeitamente com essa abordagem, permitindo que você valide comportamentos sem depender de sistemas externos.</p><p style=\"text-align: center;\"><img src=\"https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcToFHfi2H6yrPQX4xUUj2v60TRwxhKLaNyy8A&amp;s\" class=\"img-fluid\" alt=\"Girl in a jacket\" width=\"500\"></p><p>Alguns desenvolvedores acreditam que DI só é viável com frameworks pesados, como Laravel ou Symfony, mas a verdade é que o padrão pode ser aplicado mesmo em projetos simples. Basta definir interfaces claras e passar as dependências explicitamente — sem magia ou complexidade desnecessária. Isso não só melhora a organização do código, mas também prepara o terreno para evoluções futuras, como a migração para um container de DI mais robusto quando o projeto crescer.</p><p>No fim das contas, dominar a Injeção de Dependência em PHP não é sobre seguir modismos, mas sobre escrever código durável. Se você ainda trava em refatorações ou sofre com testes difíceis de manter, talvez seja hora de repensar como suas classes interagem. Comece com pequenas mudanças, desacople componentes críticos e logo você notará: sistemas mais flexíveis, testes mais eficientes e — o melhor — menos dores de cabeça no dia a dia.</p>\n",
      created_at: "2025-01-10T00:39:35.515Z",
      updated_at: "2025-07-04T19:32:03.495Z"
    }
  };

  constructor() {
    if (!environment.production) {
      const data = sessionStorage.getItem(environment.nameBlog);
      this.arrayPost = data ? JSON.parse(data) : this.arrayPost;
      sessionStorage.setItem(environment.nameBlog, JSON.stringify(this.arrayPost));
    }
  }
}
